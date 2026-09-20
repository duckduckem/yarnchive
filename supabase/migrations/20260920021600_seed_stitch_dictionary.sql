-- M1.2: seed the global stitch_dictionary with the abbreviations and
-- techniques used in both M1 test patterns (Nurtured, I'm So Basic Sock).
-- Definitions are written from scratch, not copied from either designer's
-- glossary text (patterns-private/ is licensed for personal use only and
-- never committed).
--
-- Pattern-specific items (e.g. Nurtured's named "Main Fabric Stitch
-- Pattern") are NOT seeded here — those are pattern-only entries that
-- belong in pattern_stitch_entries at import time (M1.3/M1.4), per
-- spec §3.4.

insert into stitch_dictionary (kind, abbreviation, name, definition) values
  ('stitch', 'k', 'Knit', 'Insert the right needle into the next stitch from front to back, wrap the yarn around the needle, and pull a new loop through to the front.'),
  ('stitch', 'p', 'Purl', 'Insert the right needle into the next stitch from back to front, wrap the yarn around the needle, and pull a new loop through to the back.'),
  ('stitch', 'k2tog', 'Knit Two Together', 'Knit the next two stitches as one, working them from left to right through both loops. Decreases one stitch; the resulting stitch leans right.'),
  ('stitch', 'p2tog', 'Purl Two Together', 'Purl the next two stitches as one. Decreases one stitch.'),
  ('stitch', 'ssk', 'Slip, Slip, Knit', 'Slip two stitches knitwise, one at a time, to the right needle, then knit them together through the back loops. Decreases one stitch; the resulting stitch leans left.'),
  ('stitch', 'ssp', 'Slip, Slip, Purl', 'Slip two stitches knitwise, one at a time, then slip them back to the left needle still twisted, and purl them together through the back loops. A left-leaning purl decrease.'),
  ('stitch', 'sl', 'Slip', 'Move the next stitch from the left needle to the right needle without working it, purlwise unless the pattern says otherwise.'),
  ('stitch', 'm1', 'Make One', 'Increase one stitch by lifting the strand between the stitch just worked and the next stitch onto the needle, then working into it. Used when the pattern doesn''t care which way the increase leans.'),
  ('stitch', 'm1l', 'Make One Left', 'Lift the strand between two stitches onto the left needle from front to back, then knit it through the back loop. A left-leaning increase.'),
  ('stitch', 'm1r', 'Make One Right', 'Lift the strand between two stitches onto the left needle from back to front, then knit it through the front loop. A right-leaning increase.'),
  ('stitch', 'w&t', 'Wrap and Turn', 'Slip the next stitch to the right needle, move the working yarn to the other side of the work, slip the stitch back to the left needle, then turn and work back the other way. Leaves a stitch unworked partway through a row without leaving a hole, for short rows.'),
  ('technique', 'co', 'Cast On', 'Create the first row of stitches on the needle. The specific method (e.g. long-tail, twisted German) is usually named by the pattern.'),
  ('technique', 'bo', 'Bind Off', 'Finish stitches so they come off the needle without unraveling, most commonly by knitting two stitches and passing the first one over the second, repeated across.'),
  ('technique', 'pm', 'Place Marker', 'Put a stitch marker onto the needle to flag a position, such as the start of a round or a shaping point.'),
  ('technique', 'sm', 'Slip Marker', 'Move a stitch marker from the left needle to the right needle without working the stitch next to it.'),
  ('technique', 'wyif', 'With Yarn in Front', 'Hold the working yarn in front of the work (the side facing you) before working the next stitch — most often used when slipping a stitch.'),
  ('technique', 'wyib', 'With Yarn in Back', 'Hold the working yarn in back of the work before working the next stitch — most often used when slipping a stitch.'),
  ('technique', 'twisted-german-co', 'Twisted German Cast On', 'A stretchy, two-strand cast on worked from a long tail, similar to a long-tail cast on with an extra twist around the thumb strand. Gives a stretchy edge, good for ribbing.'),
  ('technique', 'long-tail-co', 'Long-Tail Cast On', 'A common two-strand cast on worked using a measured tail end and the ball end together, giving a neat, moderately stretchy edge.'),
  ('technique', 'magic-loop', 'Magic Loop', 'A method for knitting a small circumference, like a sock or sleeve, on one long circular needle by pulling a loop of cable out between two groups of stitches instead of using double-pointed needles.'),
  ('technique', 'pick-up-knit', 'Pick Up and Knit', 'Create new stitches along an existing edge of fabric by inserting the needle into the edge, wrapping the yarn around it, and pulling through a new loop, one stitch at a time.'),
  ('technique', 'kitchener', 'Kitchener Stitch', 'A woven method of joining two sets of live stitches with a tapestry needle so the seam is invisible and stretches like knitting. Most often used to close a sock toe.');
