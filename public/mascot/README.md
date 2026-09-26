Drop the six mood images here, named exactly:

```
idle.png
thinking.png
answering.png
refusing.png
error.png
filed.png
```

`components/MascotImage.tsx` requests `/mascot/<mood>.png` and falls back to a
plain placeholder card until a file exists — nothing else needs to change.
Square, ~800–1024px, same character framing across all six so the swap
between moods doesn't jump around.
