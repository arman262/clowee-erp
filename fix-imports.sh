#!/bin/bash

# Replace supabase imports with db imports in all hook files
find src/hooks -name "*.ts" -exec sed -i 's/import { supabase } from.*$/import { db } from "@\/integrations\/postgres\/client";/g' {} \;
find src/hooks -name "*.ts" -exec sed -i '/import.*from.*supabase\/types/d' {} \;
find src/hooks -name "*.ts" -exec sed -i 's/supabase\./db\./g' {} \;

echo "Fixed all supabase imports"