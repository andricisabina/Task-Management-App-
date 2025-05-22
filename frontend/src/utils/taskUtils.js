// Normalize status for sorting
export const normalizeStatus = (status) => {
  if (!status) return '';
  return status.toLowerCase().replace(/\s|_/g, '-');
};

export const statusOrder = {
  'todo': 1,
  'to-do': 1,
  'to do': 1,
  'in-progress': 2,
  'in progress': 2,
  'on-hold': 3,
  'on hold': 3,
  'cancelled': 4,
  'completed': 5,
  'done': 5
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'todo': return '#fffbe6';
    case 'in-progress': return '#e6f7ff';
    case 'completed': return '#e6ffed';
    case 'on-hold': return '#fff0f6';
    case 'cancelled': return '#f5f5f5';
    default: return '#f9f9f9';
  }
};

export const getStatusTextColor = (status) => {
  switch (status) {
    case 'todo': return '#ad8b00';
    case 'in-progress': return '#1890ff';
    case 'completed': return '#389e0d';
    case 'on-hold': return '#c41d7f';
    case 'cancelled': return '#888';
    default: return '#222';
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent': return '#ff7875';
    case 'high': return '#ffd666';
    case 'medium': return '#91d5ff';
    case 'low': return '#d9f7be';
    default: return '#f0f0f0';
  }
};

export const getPriorityTextColor = (priority) => {
  switch (priority) {
    case 'urgent': return '#a8071a';
    case 'high': return '#ad6800';
    case 'medium': return '#0050b3';
    case 'low': return '#237804';
    default: return '#222';
  }
}; 