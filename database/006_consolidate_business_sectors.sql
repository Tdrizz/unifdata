-- Consolidate business sectors down to 5 broad buckets for v1 launch.
-- Old values (dental_medical, field_service, insurance, automotive, retail)
-- are remapped onto the new IDs so existing companies keep working.

update public.companies
set business_sector = case business_sector
  when 'dental_medical' then 'medical'
  when 'field_service' then 'home_services'
  when 'insurance' then 'professional_services'
  when 'automotive' then 'general'
  when 'retail' then 'general'
  else business_sector
end
where business_sector in (
  'dental_medical',
  'field_service',
  'insurance',
  'automotive',
  'retail'
);
