<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompartirUbicacionRequest;
use App\Models\Dinosaur;
use App\Models\UserPresence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PresenceController
{
    public function index(Request $request): JsonResponse
    {
        return $this->nearby($request->user()->getKey());
    }

    public function update(CompartirUbicacionRequest $request): JsonResponse
    {
        $position = $request->validated();
        $user = $request->user();
        $shared = UserPresence::share(
            $user, (float) $position['latitude'], (float) $position['longitude'], $request->boolean('renew'),
        );
        if (! $shared) {
            return $this->positions(null, [], 410);
        }

        return $this->nearby($user->getKey());
    }

    public function destroy(Request $request): Response
    {
        UserPresence::query()->whereKey($request->user()->getKey())->delete();

        return response()->noContent(204, ['Cache-Control' => 'private, no-store']);
    }

    private function nearby(int $userId): JsonResponse
    {
        $active = UserPresence::visible()
            ->with('user:id,name,equipped_dinosaur_id', 'user.equippedDinosaur:id,image_path');
        $viewer = (clone $active)->find($userId);
        if ($viewer === null) {
            return $this->positions(null, []);
        }

        $neighbors = $active->near($viewer)->latest('expires_at')->orderBy('user_id')->limit(30)->get();
        $starter = Dinosaur::query()->where('is_starter', true)->orderBy('sort_order')->value('image_path');
        $defaultAvatar = $this->avatar($starter) ?? asset('images/dinomaps/dino-3.webp');

        return $this->positions(
            $this->marker($viewer, $defaultAvatar),
            $neighbors->map(fn (UserPresence $neighbor) => $this->marker($neighbor, $defaultAvatar))->all(),
        );
    }

    private function positions(?array $own, array $neighbors, int $status = 200): JsonResponse
    {
        return response()->json([
            'own' => $own,
            'data' => $neighbors,
            'sharing' => $own !== null,
        ], $status, ['Cache-Control' => 'private, no-store']);
    }

    private function marker(UserPresence $presence, string $defaultAvatar): array
    {
        return [
            'name' => $presence->user->name,
            'latitude' => $presence->latitude,
            'longitude' => $presence->longitude,
            'avatar' => $this->avatar($presence->user->equippedDinosaur?->image_path) ?? $defaultAvatar,
        ];
    }

    private function avatar(?string $path): ?string
    {
        return $path !== null && preg_match('~^images/dinomaps/[a-z0-9-]+\.webp$~D', $path) === 1
            ? asset($path)
            : null;
    }
}
