--add view with spatial sql
CREATE OR REPLACE VIEW gisowner.coa_address_buffers_view_hold  AS 
-- 	SELECT
-- 	  st_transform(ST_Buffer(st_transform(shape, 2264),5280),4326)::geometry shape,
-- 	  5280::numeric(10,4) as distance,
-- 	  objectid,
-- 	  civicaddress_id
-- 	FROM gisowner.coa_opendata_address_hold
--       UNION
-- 	SELECT
-- 	  st_transform(ST_Buffer(st_transform(shape, 2264),2640),4326)::geometry shape,
-- 	  2640::numeric(10,4) as distance,
-- 	  objectid,
-- 	  civicaddress_id
-- 	FROM gisowner.coa_opendata_address_hold
--       UNION
 	SELECT
 	  st_transform(ST_Buffer(st_transform(shape, 2264),1320),4326)::geometry shape,
 	  1320::numeric(10,4) as distance,
 	  objectid,
 	  civicaddress_id
 	FROM gisowner.coa_opendata_address_hold
       UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),660),4326)::geometry shape,
	  660::numeric(10,4) as distance,
	  objectid,
	  civicaddress_id
	FROM gisowner.coa_opendata_address_hold
      UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),330),4326)::geometry shape,
	  330::numeric(10,4) as distance,
	  objectid,
	  civicaddress_id
	FROM gisowner.coa_opendata_address_hold
      UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),165),4326)::geometry shape,
	  165::numeric(10,4) as distance,
	  objectid,
	  civicaddress_id
	FROM gisowner.coa_opendata_address_hold
      UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),82.5),4326)::geometry shape,
	  82.5::numeric(10,4) as distance,
	  objectid,
	  civicaddress_id
	FROM gisowner.coa_opendata_address_hold;
	
TRUNCATE gisowner.coa_address_buffers_cache_hold;
INSERT INTO gisowner.coa_address_buffers_cache_hold 
 (SELECT 
   (row_number() OVER (ORDER BY (SHAPE)))::integer as objectid,
   --((objectid::integer)::varchar(10) || (distance::integer)::varchar(10) )::integer,
   distance,
   civicaddress_id,
   shape
  FROM gisowner.coa_address_buffers_view_hold
  --WHERE distance = 1320
    ORDER BY distance DESC);
	