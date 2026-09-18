const calculateFocusScore = (task) => {
  let score = 50;

  // Priority weighting
  if (task.priority === 'High') score += 25;
  if (task.priority === 'Medium') score += 10;
  if (task.priority === 'Low') score -= 10;

  // Due date proximity weighting
  if (task.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      score += 20; // Overdue tasks take priority
    } else if (diffDays === 0) {
      score += 25; // Due today
    } else if (diffDays === 1) {
      score += 15; // Due tomorrow
    } else if (diffDays <= 3) {
      score += 5;
    } else {
      score -= 10;
    }
  }

  // Estimated time weighting
  if (task.estimated_minutes >= 60) {
    score += 10;
  }

  // Status weighting
  if (task.status === 'In Progress') {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
};

module.exports = { calculateFocusScore };