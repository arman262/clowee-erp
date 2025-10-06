import { useQuery } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";

export const useCombinedCounterReadings = () => {
  return useQuery({
    queryKey: ['combined_counter_readings'],
    queryFn: async () => {
      // Fetch all data separately
      const [machines, readings, franchises] = await Promise.all([
        db.from('machines').select('*').order('installation_date', { ascending: false }).execute(),
        db.from('machine_counters').select('*').order('reading_date', { ascending: false }).execute(),
        db.from('franchises').select('*').execute()
      ]);

      // Create franchise lookup map
      const franchiseMap = new Map();
      franchises?.forEach(franchise => {
        franchiseMap.set(franchise.id, franchise);
      });

      // Create machine lookup map with franchise data
      const machineMap = new Map();
      machines?.forEach(machine => {
        machineMap.set(machine.id, {
          ...machine,
          franchises: machine.franchise_id ? franchiseMap.get(machine.franchise_id) : null
        });
      });

      const combinedData = [];

      // Add initial readings from machines
      machines?.forEach(machine => {
        const franchise = machine.franchise_id ? franchiseMap.get(machine.franchise_id) : null;
        combinedData.push({
          id: `initial-${machine.id}`,
          machine_id: machine.id,
          reading_date: machine.installation_date,
          coin_counter: machine.initial_coin_counter,
          prize_counter: machine.initial_prize_counter,
          notes: 'Initial reading (Installation)',
          created_at: machine.installation_date,
          type: 'initial',
          machines: {
            machine_name: machine.machine_name,
            machine_number: machine.machine_number,
            franchises: franchise
          }
        });
      });

      // Add actual readings with machine and franchise data
      readings?.forEach(reading => {
        const machine = machineMap.get(reading.machine_id);
        combinedData.push({
          ...reading,
          type: 'reading',
          machines: machine ? {
            machine_name: machine.machine_name,
            machine_number: machine.machine_number,
            franchises: machine.franchises
          } : null
        });
      });

      // Sort by date (newest first)
      combinedData.sort((a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime());

      return combinedData;
    }
  });
};