-- Additive: a plain "Brand New" condition (not claiming factory-sealed). Existing 'new' ("Brand New (Sealed)") is unchanged.
alter type public.phone_condition add value if not exists 'brand_new' after 'new';
