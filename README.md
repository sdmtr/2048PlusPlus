# 2048PlusPlus

This is the good old game 2048 with replays, undo, nicer colours (and a colour picker if you're so inclined), and milestones. It doesn't stop at 2048, nor does it stop when you have no more moves left.

While playing, hit 'z' to undo the most recent move. The undo history goes all the way back to the beginning.

As you play, the replay textarea fills up with a code you can share with other players. To replay someone else's code, just paste it into the textarea and click the play button. There are some pre-made replays in the [`replays/`](replays) directory if you want to check them out.

You can adjust delay between each replay move using the up and down arrow buttons. If the speed is set to 0, the replayer will try and make a thousand moves at a time to speed things up. Even so, very long replays can still take several minutes to run.

You can pause the replay at any point. If you click the stop button while a replay is running or paused, the current replay is truncated and you can continue playing from that point.

None of this works on mobile because I don't know how to debug javascript on mobile Safari and also I'm very lazy.

Based on the [original 2048](https://github.com/gabrielecirulli/2048) by Gabriele Cirulli.