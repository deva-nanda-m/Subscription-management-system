from django.urls import path
from .views import (
    PaymentListCreateView,
    PaymentDetailView,
    RecordManualPaymentView,
    RazorpayOrderCreateView,
    RazorpayVerifyView,
    RazorpayWebhookView,
)

urlpatterns = [
    path('payments/', PaymentListCreateView.as_view(), name='payment-list'),
    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='payment-detail'),
    path('payments/record-manual/', RecordManualPaymentView.as_view(), name='payment-record-manual'),
    path('payments/create-razorpay-order/', RazorpayOrderCreateView.as_view(), name='payment-create-razorpay-order'),
    path('payments/verify-razorpay/', RazorpayVerifyView.as_view(), name='payment-verify-razorpay'),
    path('payments/razorpay-webhook/', RazorpayWebhookView.as_view(), name='payment-razorpay-webhook'),
]

