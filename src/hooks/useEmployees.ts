import { useQuery } from '@tanstack/react-query';

export type Employee = {
  employee_id: string;
  name: string;
  designation: string;
};

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      // Hardcoded employee data to avoid CORS issues
      const employees = [
        { employee_id: "10016", name: "Md. Sohel Rana", designation: "Accountant" },
        { employee_id: "10006", name: "Md. Arman Al Sharif", designation: "COO" },
        { employee_id: "10011", name: "Badhon Kumar Roy", designation: "Software Engineer" },
        { employee_id: "10018", name: "Md. Sajibur Rahman", designation: "Assistant Engineer" },
        { employee_id: "10021", name: "Md. Rezaul Karim", designation: "Office Boy" }
      ];
      return employees;
    }
  });
};