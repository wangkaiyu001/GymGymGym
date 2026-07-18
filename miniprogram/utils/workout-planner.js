const BODY_PART_KEYWORDS = {
  胸部: ['胸', '卧推', '推胸'],
  背部: ['背', '下拉', '划船', '引体'],
  腿部: ['腿', '深蹲', '臀', '下肢'],
  肩部: ['肩', '推肩', '侧平举'],
  手臂: ['手臂', '二头', '三头', '弯举'],
  核心: ['核心', '腹', '腰'],
  全身: ['全身', '综合'],
};

const EQUIPMENT_KEYWORDS = {
  杠铃: ['杠铃', '奥杆'],
  哑铃: ['哑铃'],
  绳索: ['绳索', '龙门架', '拉力器'],
  固定器械: ['器械', '固定器械', '史密斯'],
  自重: ['徒手', '自重', '没器械', '无器械'],
  弹力带: ['弹力带'],
};

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.indexOf(keyword) >= 0);
}

function parseWorkoutPrompt(prompt, profile) {
  const text = String(prompt || '').trim().toLowerCase();
  const focusBodyParts = Object.keys(BODY_PART_KEYWORDS).filter((part) => includesAny(text, BODY_PART_KEYWORDS[part]));
  const availableEquipment = Object.keys(EQUIPMENT_KEYWORDS).filter((equipment) => includesAny(text, EQUIPMENT_KEYWORDS[equipment]));
  let energyLevel = 'normal';
  let trainingIntent = 'maintain';
  if (includesAny(text, ['状态好', '精力好', '很猛', '冲一下', '突破', 'pr'])) {
    energyLevel = 'high';
    trainingIntent = 'breakthrough';
  } else if (includesAny(text, ['累', '疲劳', '没睡好', '酸痛', '恢复', '轻一点'])) {
    energyLevel = 'low';
    trainingIntent = 'deload';
  } else if (includesAny(text, ['技术', '动作标准', '练动作'])) {
    trainingIntent = 'technique';
  }
  const timeMatch = text.match(/(\d{2,3})\s*(?:分钟|min)/i);
  const defaultEquipment = profile && Array.isArray(profile.available_equipment_home)
    ? profile.available_equipment_home
    : [];
  return {
    focus_body_parts: focusBodyParts.length ? focusBodyParts : [],
    available_equipment: availableEquipment.length ? availableEquipment : defaultEquipment,
    energy_level: energyLevel,
    training_intent: trainingIntent,
    time_limit_min: timeMatch ? Number(timeMatch[1]) : null,
    note: String(prompt || '').trim(),
  };
}

function prescriptionFor(context, history) {
  const previous = history || {};
  const previousWeight = Number(previous.last_weight_kg) || 0;
  const previousReps = Number(previous.last_reps) || 0;
  const isDeload = context.energy_level === 'low' || context.training_intent === 'deload';
  const isBreakthrough = context.training_intent === 'breakthrough';
  let weight = previousWeight;
  if (previousWeight > 0 && isDeload) weight = Math.max(0, Math.round(previousWeight * 0.85 * 2) / 2);
  if (previousWeight > 0 && isBreakthrough) weight = Math.round((previousWeight + (previousWeight >= 40 ? 2.5 : 1)) * 2) / 2;
  const sets = isDeload ? 2 : (isBreakthrough ? 4 : 3);
  const reps = previousReps > 0
    ? Math.max(5, Math.min(15, previousReps + (isDeload ? 2 : 0)))
    : (isBreakthrough ? 6 : 10);
  return { sets, reps, weight_kg: weight, rpe: isDeload ? 6 : (isBreakthrough ? 8 : 7) };
}

function buildPlan(exercises, context, historyByExercise) {
  const timeLimit = Number(context.time_limit_min) || 45;
  const exerciseCount = timeLimit <= 30 ? 3 : (timeLimit >= 70 ? 6 : 4);
  return (exercises || []).slice(0, exerciseCount).map((exercise) => {
    const prescription = prescriptionFor(context, historyByExercise[exercise._id]);
    return {
      exercise,
      prescription,
      reason: exercise.reason_text || `${exercise.body_part_zh || ''} · ${exercise.equipment_zh || ''}`,
    };
  });
}

module.exports = { parseWorkoutPrompt, prescriptionFor, buildPlan };
