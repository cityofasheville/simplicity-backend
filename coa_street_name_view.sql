--add view with spatial sql
CREATE OR REPLACE VIEW gisowner.coa_street_name_view_hold  AS 
	SELECT
		max(objectid)::integer objectid,
		ST_Multi(st_union(shape))::geometry(MultiLineString,4326) shape,
		road_class::integer,
		osm_type::character varying(150),
		full_street_name::varchar(150) as full_street_name,
		min(street_prefix)::character varying(2) as street_prefix,
		min(street_name)::character varying(30) as street_name,
		min(street_type)::character varying(4) as street_type,
		min(street_postdirection)::character varying(2) as street_postdirection,
		string_agg(centerline_id::varchar(50),',')::text as centerline_ids,
		(SELECT string_agg(data,',')::text FROM (SELECT (civicaddress_id)::text as data from gisowner.coa_civicaddress_pinnum_centerline_xref_view_hold where centerline_id::text in ((centerline_id::text))  )as hold )::text as civicaddress_ids
	FROM gisowner.coa_opendata_streets_hold
	GROUP BY full_street_name,road_class,osm_type;
	--order by street_name, street_type,street_prefix,street_postdirection;

ALTER TABLE gisowner.coa_street_name_view_hold  OWNER TO gisowner;
GRANT ALL ON TABLE gisowner.coa_street_name_view_hold  TO gisowner;
GRANT  ALL ON TABLE gisowner.coa_street_name_view_hold  TO sde;
	