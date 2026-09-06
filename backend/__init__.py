# Load the standalone Bookly account/auth routes alongside the API app.
from . import account_routes  # noqa: F401

# Enable the secure website -> Telegram account connection flow.
from . import telegram_connect  # noqa: F401,E402

# Enable CORS for the standalone Vercel account page.
from . import account_cors  # noqa: F401,E402
