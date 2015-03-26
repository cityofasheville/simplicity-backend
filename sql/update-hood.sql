update gisowner.coa_opendata_crime_hold as a
  SET neighborhood = (SELECT string_agg(tp,',')::text FROM (SELECT b.name::text as tp FROM gisowner.coa_opendata_asheville_neighborhoods_hold b WHERE st_intersects(b.shape,a.shape) ) as hold)::text;
update gisowner.coa_opendata_permits_hold as a
  SET neighborhood = (SELECT string_agg(tp,',')::text FROM (SELECT b.name::text as tp FROM gisowner.coa_opendata_asheville_neighborhoods_hold b WHERE st_intersects(b.shape,a.shape) ) as hold)::text;
update gisowner.coa_opendata_property_hold as a
  SET neighborhood = (SELECT string_agg(tp,',')::text FROM (SELECT b.name::text as tp FROM gisowner.coa_opendata_asheville_neighborhoods_hold b WHERE st_intersects(b.shape,a.shape) ) as hold)::text;
update gisowner.coa_opendata_address_hold as a
  SET neighborhood = (SELECT string_agg(tp,',')::text FROM (SELECT b.name::text as tp FROM gisowner.coa_opendata_asheville_neighborhoods_hold b WHERE st_intersects(b.shape,a.shape) ) as hold)::text;
