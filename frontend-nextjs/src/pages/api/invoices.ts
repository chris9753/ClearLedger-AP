import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const invoices = await fetchInvoicesFromDatabase();
    res.status(200).json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
}