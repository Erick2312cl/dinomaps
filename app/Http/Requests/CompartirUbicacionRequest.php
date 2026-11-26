<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompartirUbicacionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'share_name' => ['required', 'accepted'],
            'renew' => ['sometimes', 'boolean'],
        ];
    }
}
