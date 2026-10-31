from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('products.urls')),
    path('api/', include('plans.urls')),
    path('api/', include('quotations.urls')),
    path('api/', include('subscriptions.urls')),
    path('api/', include('taxes.urls')),
    path('api/', include('invoices.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('reports.urls')),
]
