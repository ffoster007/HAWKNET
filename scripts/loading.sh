#!/bin/bash

for ((i=1; i<=100; i++)); do
    filled=$((i / 2))
    empty=$((50 - filled))

    printf "\r\033[1;32m"
    for ((j=1; j<=filled; j++)); do
        printf "█"
    done
    for ((j=1; j<=empty; j++)); do
        printf "░"
    done
    printf "\033[0m %3d%% | HAWKNET" "$i"

    sleep 0.01
done

echo
echo "Analyze successfully completed."