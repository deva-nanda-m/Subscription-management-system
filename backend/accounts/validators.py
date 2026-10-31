import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


def validate_password_complexity(password: str) -> None:
    """
    Validates password strictly per requirements:
    1. Must contain MORE THAN 8 characters (i.e. >= 9 chars).
    2. Must contain at least one uppercase letter.
    3. Must contain at least one lowercase letter.
    4. Must contain at least one special character.
    """
    if not password:
        raise ValidationError(_("Password is required."))

    if len(password) <= 8:
        raise ValidationError(_("Password must contain more than 8 characters."))

    if not re.search(r'[A-Z]', password):
        raise ValidationError(_("Password must contain at least one uppercase letter."))

    if not re.search(r'[a-z]', password):
        raise ValidationError(_("Password must contain at least one lowercase letter."))

    if not re.search(r'[^A-Za-z0-9]', password):
        raise ValidationError(_("Password must contain at least one special character."))


class StrictPasswordValidator:
    """
    Django auth password validator conforming to Brightloop specifications.
    """
    def validate(self, password, user=None):
        validate_password_complexity(password)

    def get_help_text(self):
        return _(
            "Your password must contain more than 8 characters, at least one uppercase letter, "
            "one lowercase letter, and one special character."
        )

