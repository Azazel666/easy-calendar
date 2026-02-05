# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Easy Calendar is a Foundry VTT module targeting Foundry v13+. This is a new module in early development.

## Foundry VTT Module Structure

Foundry VTT modules typically include:
- `module.json` - Module manifest (id, version, compatibility, scripts, styles, etc.)
- `scripts/` - JavaScript/ES modules for module logic
- `styles/` - CSS stylesheets
- `templates/` - Handlebars templates for UI
- `lang/` - Localization JSON files
- `packs/` - Compendium pack databases (treated as binary per .gitattributes)

## Foundry VTT Development Notes

- Modules run in the browser context with access to Foundry's global APIs (game, CONFIG, Hooks, etc.)
- Use `Hooks.once('init', ...)` for initialization and `Hooks.once('ready', ...)` for post-load setup
- Register module settings via `game.settings.register()`
- Access module data via `game.modules.get('easy-calendar')`
- The module is loaded in a live Foundry instance at: http://localhost:30000 (default port)
