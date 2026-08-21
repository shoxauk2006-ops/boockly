"""Bookly Pro subscription pricing and service-limit configuration.

The base Pro subscription is $7.99/month and includes 10 services.
Additional service capacity is a recurring add-on applied at the next
subscription renewal, not immediately during the current billing period.
"""

from decimal import Decimal

PRO_BASE_PRICE = Decimal("7.99")
PRO_BASE_SERVICES = 10

# Additional recurring add-ons. Keys are the ADDITIONAL number of services.
SERVICE_ADDONS = {
    10: Decimal("4.99"),
    20: Decimal("7.99"),
    40: Decimal("11.99"),
    90: Decimal("19.99"),
}


def total_services(additional_services: int) -> int:
    if additional_services < 0:
        raise ValueError("additional_services cannot be negative")
    return PRO_BASE_SERVICES + additional_services


def total_monthly_price(additional_services: int) -> Decimal:
    """Return the full monthly price for the selected service capacity."""
    if additional_services not in SERVICE_ADDONS:
        if additional_services == 0:
            return PRO_BASE_PRICE
        raise ValueError("Unsupported service add-on")
    return PRO_BASE_PRICE + SERVICE_ADDONS[additional_services]


def service_options():
    """Return UI/API-ready options including the base 10-service tier."""
    options = [
        {
            "services": PRO_BASE_SERVICES,
            "additional_services": 0,
            "addon_price": "0.00",
            "monthly_price": f"{PRO_BASE_PRICE:.2f}",
        }
    ]
    for additional, price in SERVICE_ADDONS.items():
        options.append(
            {
                "services": total_services(additional),
                "additional_services": additional,
                "addon_price": f"{price:.2f}",
                "monthly_price": f"{PRO_BASE_PRICE + price:.2f}",
            }
        )
    return options
