const field = (label, type = 'text', options = [], flags = {}) => ({ key: '', label, type, options, required: false, printOnBill: true, isActive: true, nextVisit: false, groupHistory: false, ...flags });
const NEXT = { nextVisit: true }; // opens a follow-up (Sales → Follow-ups)
const GROUP = { groupHistory: true }; // history and follow-ups per value

/** Ready sets of bill fields; the owner can change them after applying one. */
export const BILL_FIELD_TEMPLATES = [
  { value: 'doctor', label: 'Doctor', fields: [field('Age', 'number'), field('Gender', 'dropdown', ['Male', 'Female', 'Other']), field('Diagnosis'), field('Next visit', 'date', [], NEXT)] },
  { value: 'dentist', label: 'Dentist', fields: [field('Age', 'number'), field('Tooth no.'), field('Next visit', 'date', [], NEXT)] },
  { value: 'garage', label: 'Garage', fields: [field('Vehicle number', 'text', [], GROUP), field('Model'), field('KM reading', 'number'), field('Next service date', 'date', [], NEXT)] },
  { value: 'ca', label: 'CA', fields: [field('Financial year'), field('Work period')] },
  { value: 'salon', label: 'Salon', fields: [] },
  { value: 'blank', label: 'Blank', fields: [] },
];

export const newBillField = () => field('');
