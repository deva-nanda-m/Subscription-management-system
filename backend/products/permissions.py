from rest_framework import permissions
from accounts.models import Role


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Grants write access (POST, PUT, PATCH, DELETE) exclusively to ADMIN users.
    Read access (GET, HEAD, OPTIONS) is granted to authenticated staff and customers.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False

        # Admin has full read and write access
        if request.user.role == Role.ADMIN:
            return True

        # Staff has read-only operational access
        if request.user.role == Role.STAFF and request.method in permissions.SAFE_METHODS:
            return True

        # Customer has read-only catalog browsing access
        if request.user.role == Role.CUSTOMER and request.method in permissions.SAFE_METHODS:
            return True

        return False

