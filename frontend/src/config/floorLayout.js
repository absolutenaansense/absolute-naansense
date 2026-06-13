// Dine-in floor layout. Each table has a unique `label` (used as the table key
// stored on dine-in orders) and `seats`. Edit freely — this is just display data.
// (Lives in the frontend because the DB Table.number column is integer-only and
//  can't hold labels like "B1"/"S-Stage". Migrate to DB columns later if needed.)

export const FLOOR_SECTIONS = [
  {
    name: 'Bar',
    tables: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map(label => ({ label, seats: 2 })),
  },
  {
    name: 'Stage',
    tables: [
      ...['S7', 'S8', 'S9', 'S10', 'S11', 'S12'].map(label => ({ label, seats: 4 })),
      { label: 'S-Stage', seats: 6 },
    ],
  },
  {
    name: 'Lobby',
    tables: ['L14', 'L15', 'L16', 'L17', 'L18', 'L19', 'L20'].map(label => ({ label, seats: 4 })),
  },
  {
    name: 'PDR (Private Dining)',
    tables: ['P21', 'P22', 'P23'].map(label => ({ label, seats: 8 })),
  },
  {
    name: 'Open Tables',
    tables: ['24', '25', '26', '27', '28', '29', '30'].map(label => ({ label, seats: 4 })),
  },
]

export const ALL_TABLES = FLOOR_SECTIONS.flatMap(s => s.tables.map(t => ({ ...t, section: s.name })))
