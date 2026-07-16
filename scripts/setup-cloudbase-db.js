const { spawnSync } = require('child_process');

const DEFAULT_ENV_ID = 'code-realtime-d7gbuxrbze297e600';
const COLLECTIONS = [
  'users',
  'exercises',
  'workout_sessions',
  'workout_blocks',
  'workout_sets',
  'exercise_stats',
  'user_goals',
];

function parseArgs(argv) {
  const args = {
    envId: process.env.CLOUDBASE_ENV_ID || DEFAULT_ENV_ID,
    dryRun: true,
    apply: false,
    tcb: process.env.TCB_BIN || 'tcb',
  };
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
    } else if (arg === '--tcb') {
      args.tcb = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/setup-cloudbase-db.js [--env ${DEFAULT_ENV_ID}] [--dry-run|--apply]

This script creates CloudBase NoSQL collections lazily by upserting a non-user marker document into each collection.
It does not delete or overwrite user workout data.`);
}

function markerFor(collection) {
  return {
    _id: '__gymgymgym_collection_marker__',
    type: 'system_marker',
    collection,
    note: 'Created by GymGymGym setup script. Safe to keep or delete after collection creation.',
    updated_at: new Date().toISOString(),
  };
}

function commandFor(collection) {
  const marker = markerFor(collection);
  const { _id, ...fields } = marker;
  return {
    TableName: collection,
    CommandType: 'UPDATE',
    Command: JSON.stringify({
      update: collection,
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
  if (result.status !== 0) throw new Error(`tcb failed with exit code ${result.status}`);
}

function main() {
  const args = parseArgs(process.argv);
  const commands = COLLECTIONS.map(commandFor);
  console.log(`Environment: ${args.envId}`);
  console.log(`Collections: ${COLLECTIONS.join(', ')}`);
  if (args.dryRun) {
    console.log('Dry run only. First command preview:');
    console.log(JSON.stringify(commands[0], null, 2));
    console.log('Run with --apply to create/update marker docs.');
    return;
  }
  ensureEnv(args);
  runTcb(args, commands);
  console.log('CloudBase database marker docs upserted. Configure security rules in the CloudBase console if not already applied.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { COLLECTIONS, commandFor };
