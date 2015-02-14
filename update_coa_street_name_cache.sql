TRUNCATE TABLE gisowner.coa_street_name_cache_hold;
INSERT INTO gisowner.coa_street_name_cache_hold 
 (SELECT
	objectid,
	road_class,
	osm_type,
	full_street_name,
	street_prefix,
	street_name,
	street_type,
	street_postdirection,
	centerline_ids,
	shape,
	civicaddress_ids
  FROM gisowner.coa_street_name_view_hold);