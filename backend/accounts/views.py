import os
import hashlib
from django.conf import settings
from django.db import models
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status, permissions, generics, views
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import User, Role, PasswordResetToken
from .serializers import (
    UserSerializer,
    CustomerRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    StaffCreateSerializer,
    StaffStatusUpdateSerializer,
)
from .permissions import IsAdminUserRole, IsStaffUserRole, IsCustomerUserRole


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'
    rate = '10/minute'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'
    rate = '5/minute'


class CustomerRegistrationView(generics.CreateAPIView):
    """
    Public endpoint for independent customer registration.
    Strictly assigns CUSTOMER role.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomerRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "success": True,
                "message": "Registration successful. You can now log in.",
                "user": UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )


class CustomLoginView(TokenObtainPairView):
    """
    Secure login endpoint using email and password.
    Returns JWT access & refresh tokens and user metadata.
    Sets HttpOnly refresh cookie for extra defense against XSS.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens_data = serializer.validated_data

        response = Response(
            {
                "success": True,
                "message": "Login successful.",
                "tokens": {
                    "access": tokens_data["access"],
                    "refresh": tokens_data["refresh"],
                },
                "user": tokens_data["user"],
            },
            status=status.HTTP_200_OK
        )

        # Set HttpOnly refresh token cookie
        refresh_max_age = 7 * 24 * 60 * 60  # 7 days
        is_secure = not settings.DEBUG
        response.set_cookie(
            key='refresh_token',
            value=tokens_data['refresh'],
            max_age=refresh_max_age,
            httponly=True,
            secure=is_secure,
            samesite='Lax',
            path='/api/auth/'
        )
        return response


class CustomTokenRefreshView(TokenRefreshView):
    """
    Refreshes access token. Accepts refresh token from request body
    OR from HttpOnly cookie.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Fall back to cookie if refresh token not provided in body
        data = request.data.copy()
        if 'refresh' not in data or not data['refresh']:
            cookie_refresh = request.COOKIES.get('refresh_token')
            if cookie_refresh:
                data['refresh'] = cookie_refresh

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        new_tokens = serializer.validated_data
        response = Response(
            {
                "success": True,
                "access": new_tokens.get("access"),
                "refresh": new_tokens.get("refresh", data.get("refresh"))
            },
            status=status.HTTP_200_OK
        )

        # If refresh token was rotated, update cookie
        if 'refresh' in new_tokens:
            is_secure = not settings.DEBUG
            response.set_cookie(
                key='refresh_token',
                value=new_tokens['refresh'],
                max_age=7 * 24 * 60 * 60,
                httponly=True,
                secure=is_secure,
                samesite='Lax',
                path='/api/auth/'
            )
        return response


class LogoutView(views.APIView):
    """
    Blacklists the refresh token and clears auth cookies.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Token may already be blacklisted or invalid
                pass

        response = Response(
            {"success": True, "message": "Successfully logged out."},
            status=status.HTTP_200_OK
        )
        response.delete_cookie('refresh_token', path='/api/auth/')
        return response


class UserProfileView(generics.RetrieveAPIView):
    """
    Returns current authenticated user details.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ForgotPasswordView(views.APIView):
    """
    Initiates password recovery via email.
    Generates a cryptographically secure, time-limited token (stored as SHA-256 hash).
    Sends reset URL.
    Important: Always returns identical success message to prevent email enumeration.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email__iexact=email, is_active=True)
            # Invalidate any existing unused reset tokens for this user
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

            # Generate fresh secure token
            raw_token, token_obj = PasswordResetToken.generate_token(user, lifetime_minutes=60)

            # Build reset link
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            reset_url = f"{frontend_url}/reset-password?token={raw_token}&email={user.email}"

            # Send email
            subject = "Brightloop Software - Password Reset Request"
            message = (
                f"Hello {user.full_name},\n\n"
                f"We received a request to reset your password for your Brightloop account.\n\n"
                f"Please click the link below to set a new password:\n"
                f"{reset_url}\n\n"
                f"This link is valid for 60 minutes and can only be used once.\n\n"
                f"If you did not make this request, you can safely ignore this email.\n\n"
                f"— The Brightloop Software Security Team"
            )

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            # Do not reveal whether email exists for security
            pass
        except Exception as e:
            # In debug mode log error, but still return success message
            if settings.DEBUG:
                print(f"Password reset email delivery error: {e}")

        return Response(
            {
                "success": True,
                "message": "If an account with that email exists, a password reset link has been sent to it."
            },
            status=status.HTTP_200_OK
        )


class ResetPasswordView(views.APIView):
    """
    Completes password recovery.
    Validates token hash, expiration and single-use status.
    Enforces password complexity.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        raw_token = serializer.validated_data['token']
        new_password = serializer.validated_data['password']

        token_hash = PasswordResetToken.hash_token(raw_token)

        try:
            token_record = PasswordResetToken.objects.get(
                user__email__iexact=email,
                token_hash=token_hash
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"success": False, "message": "Invalid or expired password reset link."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not token_record.is_valid:
            return Response(
                {"success": False, "message": "This password reset link has expired or has already been used."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = token_record.user
        if not user.is_active:
            return Response(
                {"success": False, "message": "This account is inactive. Please contact support."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Update password
        user.set_password(new_password)
        user.save()

        # Invalidate current token and all other tokens for user
        token_record.is_used = True
        token_record.save()
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        return Response(
            {
                "success": True,
                "message": "Password has been successfully reset. You can now log in with your new password."
            },
            status=status.HTTP_200_OK
        )


# ==============================================================================
# Admin - Staff Management Views
# ==============================================================================

class AdminStaffListCreateView(generics.ListCreateAPIView):
    """
    Admin-only endpoint:
    - GET: List all staff accounts (with search & status filter)
    - POST: Create a new staff account
    """
    permission_classes = [IsAdminUserRole]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StaffCreateSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.filter(role=Role.STAFF).order_by('-date_joined')
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(full_name__icontains=search) | models.Q(email__icontains=search)
            )
        status_param = self.request.query_params.get('status', '').strip().lower()
        if status_param == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_param == 'inactive':
            queryset = queryset.filter(is_active=False)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        staff_user = serializer.save()
        return Response(
            {
                "success": True,
                "message": f"Staff account for {staff_user.full_name} created successfully.",
                "staff": UserSerializer(staff_user).data
            },
            status=status.HTTP_201_CREATED
        )


class AdminStaffDetailView(generics.RetrieveAPIView):
    """
    Admin-only endpoint:
    - GET: View staff account details
    """
    permission_classes = [IsAdminUserRole]
    serializer_class = UserSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return User.objects.filter(role=Role.STAFF)


class AdminStaffStatusUpdateView(views.APIView):
    """
    Admin-only endpoint:
    - PATCH /api/admin/staff/<id>/status/
    - Activate or deactivate a staff account
    """
    permission_classes = [IsAdminUserRole]

    def patch(self, request, pk):
        try:
            staff_user = User.objects.get(pk=pk, role=Role.STAFF)
        except User.DoesNotExist:
            return Response(
                {"success": False, "message": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = StaffStatusUpdateSerializer(staff_user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get('is_active')

        # Safeguard: prevent deactivating own account if admin has staff role somehow
        if staff_user.id == request.user.id and new_status is False:
            return Response(
                {"success": False, "message": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save()
        status_text = "activated" if staff_user.is_active else "deactivated"

        return Response(
            {
                "success": True,
                "message": f"Staff member {staff_user.full_name} has been {status_text}.",
                "staff": UserSerializer(staff_user).data
            },
            status=status.HTTP_200_OK
        )
