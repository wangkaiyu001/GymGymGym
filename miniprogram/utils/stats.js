function calcSetMetrics(weightKg, reps) {
  const weight = Number(weightKg) || 0;
  const count = Number(reps) || 0;
  const volume = Math.round(weight * count * 10) / 10;
  const estimated = weight > 0 && count > 0 ? Math.round(weight * (1 + count / 30) * 10) / 10 : 0;
  return {
    volume_kg: volume,
    estimated_1rm_kg: estimated,
  };
}

function aggregateSets(sets) {
  return sets.reduce((acc, item) => {
    if (item.is_warmup) return acc;
    const reps = Number(item.reps) || 0;
    const weight = Number(item.weight_kg) || 0;
    const volume = Number(item.volume_kg) || weight * reps;
    acc.total_sets += 1;
    acc.total_reps += reps;
    acc.total_volume_kg += volume;
    acc.max_weight_kg = Math.max(acc.max_weight_kg, weight);
    acc.estimated_1rm_kg = Math.max(acc.estimated_1rm_kg, Number(item.estimated_1rm_kg) || 0);
    return acc;
  }, {
    total_sets: 0,
    total_reps: 0,
    total_volume_kg: 0,
    max_weight_kg: 0,
    estimated_1rm_kg: 0,
  });
}

module.exports = {
  calcSetMetrics,
  aggregateSets,
};
