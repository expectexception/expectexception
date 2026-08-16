# Profile auto-creation lives in apps/profiles/signals.py, the app that owns
# the Profile model. This module previously registered a duplicate receiver for
# the same post_save signal.
