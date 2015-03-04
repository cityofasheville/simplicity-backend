#!/bin/bash
echo $(date)
PGPASSWORD=[CHANGE-TO-YOUR-POSTGRES-PASSWORD]
export PGPASSWORD
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/update-hood.sql
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/update_text_civicid.sql
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/fix-unkown.sql
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/create-opendata-address-buffer-view.sql
sleep 2m
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/resequence_cache.sql
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/truncate_cache.sql
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/reindex-shapes.sql
rcraw=$(psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/address_count.sql -t)
START=0
inc=1000
i=$START
END=$((rcraw+0))
OLDIFS=$IFS
IFS=","
while [ $i -le $END ]
do
    ((n=$i+$inc))
    layerids=$(psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/layer_id.sql -t)
    for layerid in $layerids
    do
      layername=$(psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/layer_name.sql -t -v one=$layerid)
      shopt -s extglob
      layername=${layername##*( )}
      shopt -u extglob

      layerdist=$(psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/layer_distance.sql -t -v one=$layerid)
      shopt -s extglob
      layerdist=${layerdist##*( )}
      shopt -u extglob

      layersql=$(psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/layer_sql.sql -t -v one=$layerid)
      shopt -s extglob
      layersql=${layersql##*( )}
      shopt -u extglob

      if [  $((layerdist+0)) -eq 1 ]
      then
        distances=$(psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/distances.sql -t)
        for dist in $distances
        do
          shopt -s extglob
          dist=${dist##*( )}
          shopt -u extglob
          echo "Processing records $i - $n using $layername at a distance of $dist"
          /usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/$layersql  -v overlaytype="'$layername'" -v distance=$dist -v record=$i -v offset=$inc &
        done
      else
         echo "Processing records $i - $n using $layername"
         /usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/$layersql  -v overlaytype="'$layername'" -v distance=0 -v record=$i -v offset=$inc &
      fi
    done
    echo $(echo "scale=2; ($i/$END)*100" | /usr/bin/bc)" % complete"
    ((i = i + $inc))
    sleep 3
done
IFS=$OLDIFS
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/remove_blanks.sql &
sleep 600
echo $(date)
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/update_coa_street_name_cache.sql &
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/update-live.sql &
sleep 600
/usr/bin/psql -U [CHANGE-TO-YOUR-POSTGRES-USERNAME] -d coagis -f /home/ubuntu/job/reindex-shapes.sql
