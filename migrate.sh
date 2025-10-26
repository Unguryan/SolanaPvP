#!/bin/bash

# Bash script to run Entity Framework migrations
# Usage: ./migrate.sh [add|update|remove] [migration-name]

if [ $# -lt 1 ]; then
    echo "Usage: $0 [add|update|remove] [migration-name]"
    echo "Examples:"
    echo "  $0 add InitialCreate"
    echo "  $0 update"
    echo "  $0 remove"
    exit 1
fi

ACTION=$1
MIGRATION_NAME=$2
PROJECT_PATH="API/SolanaPvP.EF_Core"
STARTUP_PROJECT="API/SolanaPvP.API_Project"

echo "Running EF Core migration: $ACTION"

case $ACTION in
    "add")
        if [ -z "$MIGRATION_NAME" ]; then
            echo "Migration name is required for 'add' action"
            exit 1
        fi
        echo "Adding migration: $MIGRATION_NAME"
        dotnet ef migrations add "$MIGRATION_NAME" --project "$PROJECT_PATH" --startup-project "$STARTUP_PROJECT"
        ;;
    "update")
        echo "Updating database..."
        dotnet ef database update --project "$PROJECT_PATH" --startup-project "$STARTUP_PROJECT"
        ;;
    "remove")
        echo "Removing last migration..."
        dotnet ef migrations remove --project "$PROJECT_PATH" --startup-project "$STARTUP_PROJECT"
        ;;
    *)
        echo "Invalid action: $ACTION"
        echo "Valid actions: add, update, remove"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Migration failed!"
    exit 1
fi
