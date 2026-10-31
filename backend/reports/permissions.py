from rest_framework import permissions
from accounts.models import Role


class IsAdminOrStaff(permissions.BasePermission):
    """
    Financial reports are accessible only by Admin and Staff.
    Customers are strictly prohibited.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.ADMIN, Role.STAFF]
        )

