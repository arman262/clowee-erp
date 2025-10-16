#!/bin/bash

# Script to apply spectator permissions to remaining pages

for file in Payments Banks CounterReadings ExpenseCategories Invoices; do
  filepath="src/pages/${file}.tsx"
  
  if [ -f "$filepath" ]; then
    echo "Processing $file..."
    
    # Add import if not exists
    if ! grep -q "usePermissions" "$filepath"; then
      # Find the last import line and add after it
      sed -i '/^import.*from/a import { usePermissions } from "@/hooks/usePermissions";' "$filepath"
    fi
    
    # Add const { canEdit } after function declaration
    if ! grep -q "const { canEdit }" "$filepath"; then
      sed -i "/export default function ${file}()/a \  const { canEdit } = usePermissions();" "$filepath"
    fi
    
    echo "✓ Updated $file"
  fi
done

echo "Done! Manual wrapping of buttons still needed."
