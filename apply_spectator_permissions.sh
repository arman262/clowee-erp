#!/bin/bash

# Script to apply spectator permissions to remaining pages

for file in Payments Banks CounterReadings ExpenseCategories Invoices; do
  filepath="src/pages/${file}.tsx"
  
  if [ -f "$filepath" ]; then
    echo "Processing $file..."
    
    # Add import if not exists
    if ! grep -q "usePermissions" "$filepath"; then
      # Find the last import line and add after it
      if ! sed -i '/^import.*from/a import { usePermissions } from "@/hooks/usePermissions";' "$filepath"; then
        echo "Error: Failed to add import to $file" >&2
        continue
      fi
    fi
    
    # Add const { canEdit } after function declaration
    if ! grep -q "const { canEdit }" "$filepath"; then
      if ! sed -i "/export default function ${file}()/a \  const { canEdit } = usePermissions();" "$filepath"; then
        echo "Error: Failed to add canEdit to $file" >&2
        continue
      fi
    fi
    
    echo "✓ Updated $file"
  fi
done

echo "Done! Manual wrapping of buttons still needed."
