import hashlib
import secrets
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone


class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    STAFF = 'STAFF', 'Staff'
    CUSTOMER = 'CUSTOMER', 'Customer'


class UserManager(BaseUserManager):
    """
    Custom user model manager where email is the unique identifier
    for authentication instead of usernames.
    """
    def create_user(self, email, full_name, password=None, role=Role.CUSTOMER, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email).lower()
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, full_name=full_name, role=role, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for Brightloop Subscription Management System.
    Strictly adheres to requirements:
    - id
    - full_name
    - email (unique, auth identifier)
    - password
    - role (ADMIN, STAFF, CUSTOMER)
    - is_active
    - is_staff (Django administrative privilege, not the application's Staff role)
    - date_joined
    - updated_at
    """
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER, db_index=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def is_admin_role(self):
        return self.role == Role.ADMIN

    @property
    def is_staff_role(self):
        return self.role == Role.STAFF

    @property
    def is_customer_role(self):
        return self.role == Role.CUSTOMER


class PasswordResetToken(models.Model):
    """
    Secure password reset token model with single-use, expiring tokens.
    Tokens are stored as cryptographic SHA-256 hashes, NEVER in plaintext.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token_hash = models.CharField(max_length=128, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        ordering = ['-created_at']

    def __str__(self):
        return f"Reset Token for {self.user.email} (used={self.is_used})"

    @property
    def is_valid(self):
        return (not self.is_used) and (timezone.now() < self.expires_at)

    @classmethod
    def generate_token(cls, user, lifetime_minutes=60):
        """
        Generates a cryptographically secure random token,
        stores its SHA-256 hash in the database, and returns the raw token string.
        """
        raw_token = secrets.token_urlsafe(48)
        token_hash = cls.hash_token(raw_token)
        expires_at = timezone.now() + timedelta(minutes=lifetime_minutes)

        token_record = cls.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False
        )
        return raw_token, token_record

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()
