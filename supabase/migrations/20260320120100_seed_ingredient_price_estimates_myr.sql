-- Sample MYR price estimates for grocery list rollup (illustrative; replace with real data).
-- ingredient_key must match lowercase trimmed names from recipes (same as GroceryItem.normalizedName).
-- bundle_unit must match the unit on the grocery line for the client to apply the estimate.

insert into public.ingredient_retailer_price_estimate (retailer_id, ingredient_key, price_myr, bundle_quantity, bundle_unit)
select r.id, v.ingredient_key, v.price_myr, v.bundle_quantity, v.bundle_unit
from public.shop_retailer r
cross join (
  values
    ('onion', 1.20, 1, 'piece'),
    ('garlic', 1.50, 1, 'piece'),
    ('tomato', 2.00, 1, 'piece'),
    ('egg', 0.55, 1, 'piece'),
    ('eggs', 2.20, 6, 'piece'),
    ('milk', 7.90, 1, 'l'),
    ('butter', 9.50, 1, 'pack'),
    ('salt', 2.80, 1, 'pack'),
    ('sugar', 4.50, 1, 'pack'),
    ('rice', 12.00, 1, 'kg'),
    ('chicken', 18.00, 1, 'kg'),
    ('oil', 11.00, 1, 'l'),
    ('potato', 1.80, 1, 'piece'),
    ('carrot', 1.50, 1, 'piece'),
    ('ginger', 3.50, 1, 'piece')
) as v(ingredient_key, price_myr, bundle_quantity, bundle_unit)
where r.slug = 'speedmart_99'
on conflict (retailer_id, ingredient_key) do update set
  price_myr = excluded.price_myr,
  bundle_quantity = excluded.bundle_quantity,
  bundle_unit = excluded.bundle_unit,
  updated_at = now();

insert into public.ingredient_retailer_price_estimate (retailer_id, ingredient_key, price_myr, bundle_quantity, bundle_unit)
select r.id, v.ingredient_key, v.price_myr, v.bundle_quantity, v.bundle_unit
from public.shop_retailer r
cross join (
  values
    ('onion', 1.40, 1, 'piece'),
    ('garlic', 1.80, 1, 'piece'),
    ('tomato', 2.40, 1, 'piece'),
    ('egg', 0.65, 1, 'piece'),
    ('eggs', 2.60, 6, 'piece'),
    ('milk', 8.50, 1, 'l'),
    ('butter', 10.90, 1, 'pack'),
    ('salt', 3.20, 1, 'pack'),
    ('sugar', 5.20, 1, 'pack'),
    ('rice', 13.50, 1, 'kg'),
    ('chicken', 22.00, 1, 'kg'),
    ('oil', 12.50, 1, 'l'),
    ('potato', 2.00, 1, 'piece'),
    ('carrot', 1.70, 1, 'piece'),
    ('ginger', 4.00, 1, 'piece')
) as v(ingredient_key, price_myr, bundle_quantity, bundle_unit)
where r.slug = 'jaya_grocer'
on conflict (retailer_id, ingredient_key) do update set
  price_myr = excluded.price_myr,
  bundle_quantity = excluded.bundle_quantity,
  bundle_unit = excluded.bundle_unit,
  updated_at = now();
