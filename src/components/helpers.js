export const daysLabel = (d) => (d < 0 ? `Overdue ${-d}d` : d === 0 ? 'Due today' : `In ${d}d`);
