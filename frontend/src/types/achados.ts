/** Achados e perdidos (espelha backend/ram/routes/achados.py). */

export interface LostItem {
  id: number;
  name: string;
  description: string;
  place: string;
  /** AAAA-MM-DD */
  foundOn: string;
  returned: boolean;
  returnedTo: string;
  returnedAt: number | null;
  createdAt: number;
}

export interface LostItemInput {
  name: string;
  description: string;
  place: string;
  foundOn: string;
}
