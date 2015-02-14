SELECT string_agg(trim(tp),',')::text FROM  (SELECT b.objectid::text as tp FROM gisowner.coa_control_layers b group by objectid) as hold;
