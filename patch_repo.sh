# Fix TS error on _raw
sed -i 's/const raw = (syn as IngredientSynonym)._raw;/const raw = (syn as IngredientSynonym)._raw as any;/' data/db/repositories/StockRepository.ts
