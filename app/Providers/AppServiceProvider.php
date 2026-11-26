<?php

namespace App\Providers;

use App\Models\User;
use App\View\Composers\PerfilCuentaComposer;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::define('gestionar-catalogo', fn (User $user): bool => $user->is_admin === true);
        View::composer(['cuenta.index', 'cuenta.panel-perfil'], PerfilCuentaComposer::class);
    }
}
