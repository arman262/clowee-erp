import { useQuery } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";

export const useCombinedCounterReadings = () => {
  return useQuery({
    queryKey: ['combined_counter_readings'],
    queryFn: async () => {
      // Get machines with initial counters
      const machines = await db
        .from('machines')
        .select('*')
        .order('installation_date', { ascending: false })
        .execute();

      // Get counter readings
      const readings = await db
        .from('machine_counters')
        .select('*')
        .order('reading_date', { ascending: false })
        .execute();

      // Combine data: initial readings + actual readings
      const combinedData = [];

      // Add initial readings from machines
      machines?.forEach(machine => {
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
            franchises: machine.franchises
          }
        });
      });

      // Add actual readings
      readings?.forEach(reading => {
        combinedData.push({
          ...reading,
          type: 'reading'
        });
      });

      // Sort by date (newest first)
      combinedData.sort((a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime());

      return combinedData;
    }
  });
};