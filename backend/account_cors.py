from fastapi.middleware.cors import CORSMiddleware

from .app import app

# The standalone Bookly account page is served from Vercel while the API is
# hosted separately. Allow Bookly Vercel deployments to call the account API.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://boockly(?:-[a-z0-9]+)?(?:-shoxauk2006-4950s-projects)?\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
