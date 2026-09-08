# Load the standalone Bookly account/auth routes alongside the API app.
from . import account_routes  # noqa: F401

# Load the web business onboarding flow.
from . import account_onboarding  # noqa: F401,E402

# Enable CORS for the standalone Vercel account page.
from . import account_cors  # noqa: F401,E402

# Enforce the website-only business creation policy for Telegram Mini Apps.
from . import telegram_business_policy  # noqa: F401,E402
