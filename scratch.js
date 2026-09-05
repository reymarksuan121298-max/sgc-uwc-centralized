import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kiuykhakbpjesoofinil.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdXlraGFrYnBqZXNvb2ZpbmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDAxNDAsImV4cCI6MjA5NTE3NjE0MH0.g6eFVGHsX6svgWpWKGHNCFsYYF7kEhLGkEKBgAtcA4E'
);

async function checkTransaction() {
  const { data, error } = await supabase
    .from('returned_winnings')
    .select('*')
    .eq('transactionId', '083026-IOIWXXMU');

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}

checkTransaction();
