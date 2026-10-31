from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate
from django.utils.translation import gettext as _

from .models import User, Role
from .validators import validate_password_complexity


class UserSerializer(serializers.ModelSerializer):
    """
    Standard serializer for User profile and details.
    Role and status are read-only to prevent unauthorized modification.
    """
    class Meta:
        model = User
        fields = [
            'id',
            'full_name',
            'email',
            'role',
            'is_active',
            'is_staff',
            'date_joined',
            'updated_at',
        ]
        read_only_fields = ['id', 'role', 'is_staff', 'date_joined', 'updated_at']


class CustomerRegistrationSerializer(serializers.ModelSerializer):
    """
    Customer registration serializer.
    Strictly validates:
    - Unique email (case-insensitive)
    - Valid email format
    - Password rules: > 8 chars, 1 uppercase, 1 lowercase, 1 special char
    - Confirm password matching
    - Automatically enforces CUSTOMER role
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Must contain more than 8 characters, uppercase, lowercase, and special character."
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['full_name', 'email', 'password', 'confirm_password']

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError(_("A user with this email address already exists."))
        return normalized_email

    def validate_password(self, value):
        validate_password_complexity(value)
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": _("Passwords do not match.")})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        # Role is explicitly hardcoded to CUSTOMER by backend enforcement
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            password=password,
            role=Role.CUSTOMER
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT login serializer:
    - Uses email for authentication
    - Enforces active status check
    - Embeds role, full_name, email in JWT payload claims
    - Returns structured user metadata with tokens
    """
    username_field = 'email'

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        if not email or not password:
            raise AuthenticationFailed(_("Both email and password are required."))

        user = authenticate(
            request=self.context.get('request'),
            email=email,
            password=password
        )

        if not user:
            # Django's ModelBackend returns None if user.is_active is False.
            # Inspect candidate to provide explicit feedback for inactive accounts.
            try:
                candidate = User.objects.get(email__iexact=email)
                if candidate.check_password(password) and not candidate.is_active:
                    raise AuthenticationFailed(_("This account is inactive. Please contact support."))
            except User.DoesNotExist:
                pass
            raise AuthenticationFailed(_("Invalid email or password."))

        if not user.is_active:
            raise AuthenticationFailed(_("This account is inactive. Please contact support."))

        self.user = user
        refresh = self.get_token(user)

        # Embed custom claims into the JWT token
        refresh['user_id'] = user.id
        refresh['email'] = user.email
        refresh['full_name'] = user.full_name
        refresh['role'] = user.role

        access = refresh.access_token
        access['user_id'] = user.id
        access['email'] = user.email
        access['full_name'] = user.full_name
        access['role'] = user.role

        return {
            'refresh': str(refresh),
            'access': str(access),
            'user': UserSerializer(user).data
        }


class ForgotPasswordSerializer(serializers.Serializer):
    """
    Validates email for forgot password request.
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class ResetPasswordSerializer(serializers.Serializer):
    """
    Validates token, email and new password for password reset.
    """
    email = serializers.EmailField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_password(self, value):
        validate_password_complexity(value)
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": _("Passwords do not match.")})
        return attrs


class StaffCreateSerializer(serializers.ModelSerializer):
    """
    Serializer used by Admin to create a new Staff account.
    - Validates email uniqueness
    - Enforces password complexity
    - Automatically assigns STAFF role
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'password', 'confirm_password', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'role', 'is_active', 'date_joined']

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError(_("A user with this email address already exists."))
        return normalized_email

    def validate_password(self, value):
        validate_password_complexity(value)
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": _("Passwords do not match.")})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            password=password,
            role=Role.STAFF,
            is_active=True,
            is_staff=False
        )
        return user


class StaffStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating staff active/inactive status.
    """
    class Meta:
        model = User
        fields = ['is_active']
