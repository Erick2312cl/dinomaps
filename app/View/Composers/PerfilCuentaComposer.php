<?php

namespace App\View\Composers;

use App\Models\Dinosaur;
use Illuminate\View\View;

class PerfilCuentaComposer
{
    public function compose(View $view): void
    {
        $user = auth()->user();
        if ($user === null) {
            return;
        }

        $avatar = $user->equippedDinosaur
            ?? Dinosaur::query()->where('is_starter', true)->orderBy('sort_order')->first();

        $view->with([
            'profileAvatar' => $avatar?->image_path ?? 'images/dinomaps/dino-3.webp',
            'profileRank' => $user->dinosaurRank(),
        ]);
    }
}
