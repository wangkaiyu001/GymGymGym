const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_ENV_ID = 'code-realtime-d7gbuxrbze297e600';
const DEFAULT_INPUT = path.join(process.cwd(), 'dist/exercises.normalized.json');

function parseArgs(argv) {
  const args = {
    inputPath: DEFAULT_INPUT,
    envId: process.env.CLOUDBASE_ENV_ID || DEFAULT_ENV_ID,
    dryRun: true,
    apply: false,
    limit: 0,
    batchSize: 20,
    tcb: process.env.TCB_BIN || 'tcb',
  };
  const positionals = [];

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--env') {
      args.envId = argv[index + 1];
      index += 1;
    } else if (arg === '--apply') {
      args.apply = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
      args.apply = false;
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1] || 0);
      index += 1;
    } else if (arg === '--batch-size') {
      args.batchSize = Number(argv[index + 1] || 20);
      index += 1;
    } else if (arg === '--tcb') {
      args.tcb = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals[0]) args.inputPath = path.resolve(positionals[0]);
  if (!args.envId) throw new Error('Missing CloudBase env id. Pass --env <envId>.');
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 100) {
    throw new Error('--batch-size must be an integer from 1 to 100');
  }
  if (!Number.isInteger(args.limit) || args.limit < 0) {
    throw new Error('--limit must be a non-negative integer');
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/import-exercises.js [input] [--env ${DEFAULT_ENV_ID}] [--dry-run|--apply] [--limit N] [--batch-size N]

Examples:
  node scripts/import-exercises.js dist/exercises.normalized.json --dry-run
  node scripts/import-exercises.js dist/exercises.normalized.json --apply --limit 5
  node scripts/import-exercises.js dist/exercises.normalized.json --apply

The script uses CloudBase CLI: tcb db nosql execute --command <Mongo command JSON>.
It upserts documents into the exercises collection by _id.`);
}

function readRows(inputPath, limit) {
  if (!fs.existsSync(inputPath)) throw new Error(`Input file not found: ${inputPath}`);
  const rows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(rows)) throw new Error('Input file must contain a JSON array');
  const selected = limit ? rows.slice(0, limit) : rows;
  for (const row of selected) {
    if (!row._id || !row.name) throw new Error(`Invalid exercise row: ${JSON.stringify(row).slice(0, 120)}`);
  }
  return selected;
}

function buildUpdateCommands(rows) {
  return rows.map((row) => {
    const { _id, ...fields } = row;
    return {
      TableName: 'exercises',
      CommandType: 'UPDATE',
      Command: JSON.stringify({
        update: 'exercises',
        updates: [{
          q: { _id },
          u: {
            $set: fields,
            $setOnInsert: { _id },
          },
          upsert: true,
        }],
      }),
    };
  });
}

function ensureEnv(args) {
  const result = spawnSync(args.tcb, ['env', 'use', args.envId], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`tcb env use failed with exit code ${result.status}`);
  }
}

function runTcb(args, commands) {
  const result = spawnSync(args.tcb, [
    'db', 'nosql', 'execute',
    '--command', JSON.stringify(commands),
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`tcb db nosql execute failed with exit code ${result.status}`);
  }
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function main() {
  const args = parseArgs(process.argv);
  const rows = readRows(args.inputPath, args.limit);
  console.log(`Input: ${args.inputPath}`);
  console.log(`Environment: ${args.envId}`);
  console.log(`Rows: ${rows.length}`);

  if (rows.length === 0) {
    console.log('No rows to import.');
    return;
  }

  const previewCommands = buildUpdateCommands(rows.slice(0, Math.min(2, rows.length)));
  if (args.dryRun) {
    console.log('Dry run only. No CloudBase writes will be performed.');
    console.log('First command preview:');
    console.log(JSON.stringify(previewCommands[0], null, 2));
    console.log('Run again with --apply to upsert exercises into CloudBase.');
    return;
  }

  ensureEnv(args);
  const batches = chunk(rows, args.batchSize);
  batches.forEach((batch, index) => {
    console.log(`Importing batch ${index + 1}/${batches.length} (${batch.length} rows)...`);
    runTcb(args, buildUpdateCommands(batch));
  });
  console.log(`Imported ${rows.length} exercises into exercises collection.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildUpdateCommands,
  readRows,
};
