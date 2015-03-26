TRUNCATE TABLE gisowner.coa_address_azimuthal_from_street_view;
INSERT INTO gisowner.coa_address_azimuthal_from_street_view (SELECT * FROM gisowner.coa_address_azimuthal_from_street_view_hold);

TRUNCATE TABLE gisowner.coa_address_buffers_cache;
INSERT INTO gisowner.coa_address_buffers_cache (SELECT * FROM gisowner.coa_address_buffers_cache_hold);

TRUNCATE TABLE gisowner.coa_civicaddress_pinnum_centerline_xref_view;
INSERT INTO gisowner.coa_civicaddress_pinnum_centerline_xref_view (SELECT * FROM gisowner.coa_civicaddress_pinnum_centerline_xref_view_hold);

TRUNCATE TABLE gisowner.coa_opendata_address;
INSERT INTO gisowner.coa_opendata_address (SELECT * FROM gisowner.coa_opendata_address_hold);

TRUNCATE TABLE gisowner.coa_opendata_asheville_neighborhoods;
INSERT INTO gisowner.coa_opendata_asheville_neighborhoods (SELECT * FROM gisowner.coa_opendata_asheville_neighborhoods_hold);

TRUNCATE TABLE gisowner.coa_opendata_city_limits;
INSERT INTO gisowner.coa_opendata_city_limits (SELECT * FROM gisowner.coa_opendata_city_limits_hold);

TRUNCATE TABLE gisowner.coa_opendata_crime;
INSERT INTO gisowner.coa_opendata_crime (SELECT * FROM gisowner.coa_opendata_crime_hold);

TRUNCATE TABLE gisowner.coa_opendata_permits;
INSERT INTO gisowner.coa_opendata_permits (SELECT * FROM gisowner.coa_opendata_permits_hold order by record_status_date);

TRUNCATE TABLE gisowner.coa_opendata_property;
INSERT INTO gisowner.coa_opendata_property (SELECT * FROM gisowner.coa_opendata_property_hold);

TRUNCATE TABLE gisowner.coa_opendata_sanitation_districts;
INSERT INTO gisowner.coa_opendata_sanitation_districts (SELECT * FROM gisowner.coa_opendata_sanitation_districts_hold);

TRUNCATE TABLE gisowner.coa_opendata_streets;
INSERT INTO gisowner.coa_opendata_streets (SELECT * FROM gisowner.coa_opendata_streets_hold);

TRUNCATE TABLE gisowner.coa_opendata_zoning;
INSERT INTO gisowner.coa_opendata_zoning (SELECT * FROM gisowner.coa_opendata_zoning_hold);

TRUNCATE TABLE gisowner.coa_opendata_zoning_overlays;
INSERT INTO gisowner.coa_opendata_zoning_overlays (SELECT * FROM gisowner.coa_opendata_zoning_overlays_hold);

TRUNCATE TABLE gisowner.coa_opendata_permits;
INSERT INTO gisowner.coa_opendata_permits (SELECT * FROM gisowner.coa_opendata_permits_hold);

TRUNCATE TABLE gisowner.coa_overlay_data_cache;
INSERT INTO gisowner.coa_overlay_data_cache (SELECT * FROM gisowner.coa_overlay_data_cache_hold);

TRUNCATE TABLE gisowner.coa_street_name_cache;
INSERT INTO gisowner.coa_street_name_cache (SELECT * FROM gisowner.coa_street_name_cache_hold);
