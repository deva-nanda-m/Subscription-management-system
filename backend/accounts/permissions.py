from rest_framework import permissions
from .models import Role


class IsAdminUserRole(permissions.BasePermission):
    """
    Grants access only to users with the application 'ADMIN' role.
    Note: Distinguishes between Django's is_staff and the application's ADMIN role.
    """
    message = "Access restricted to Brightloop Administrator accounts."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            request.user.role == Role.ADMIN
        )


class IsStaffUserRole(permissions.BasePermission):
    """
    Grants access to STAFF and ADMIN users for operational endpoints.
    """
    message = "Access restricted to Brightloop Staff and Administrator accounts."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            request.user.role in [Role.STAFF, Role.ADMIN]
        )


class IsCustomerUserRole(permissions.BasePermission):
    """
    Grants access to CUSTOMER users only.
    """
    message = "Access restricted to Customer accounts."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            request.user.role == Role.CUSTOMER
        )


class IsOwnerOrAdminStaff(permissions.BasePermission):
    """
    Object-level permission allowing Customers to view/edit ONLY their own data.
    Admin and Staff can access if authorized.
    """
    message = "You do not have permission to access another user's information."

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False

        if request.user.role == Role.ADMIN:
            return True

        if request.user.role == Role.STAFF:
            return True

        # For customer, check object ownership
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'email'):
            return obj.id == request.user.id

        return False

