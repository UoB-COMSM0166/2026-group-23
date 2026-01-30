# Game Design Concept: Big Fish Eating Small Fish / Mowing Lawn Type 2D Casual Game 
## 1. Game Overview 
This game is a 2D casual game. Players control the character to move around the scene, hunt small creatures to grow, and avoid being preyed upon by larger creatures. The game mechanism is simple and intuitive, suitable for light entertainment and short-term mobile gameplay. 
**Core Gameplay: ** 
- Players control the character's movement using the mouse or keyboard.
- There are various small creatures in the scene, with basic AI behaviors.
- After eating the small creatures, the player character's size increases, while the movement speed slightly decreases.
- The sound effects and visual feedback in the scene enhance the immersion. 
---

## 2. Game System Design 
1. Control System 
- **Player Input**: Movement of the character is controlled by mouse or keyboard. 
- **Movement Optimization**: Smooth interpolation for movement to ensure a smooth and natural motion of the character. 
- **Boundary Handling**: Collision detection at the scene edges to prevent the character from moving out of the canvas range. 
2. Biological Behavior System 
- **Small Biological AI**:
  - Move randomly to create a natural swimming effect
  - Accelerate in escape or pursuit when encountering players or larger creatures
- **Growth Mechanism**:
  - The character's size increases after the player eats the small creatures
  - The character's speed slightly decreases as the size increases, creating a balance mechanism 
3. Collision Detection 
- **Basic Method**:
  - Circular Collision Detection: $(x_1 - x_2)^2 + (y_1 - y_2)^2 < (r_1 + r_2)^2$
  - Or Rectangular Collision Detection, used for square or rectangular elements
- **Optimization Considerations**:
  - Minimize the number of collision detections per frame
  - Reduce the number of canvas redrawing operations to enhance the stability of frame rate 
4. Sound Effects and Feedback 
- Use background music and event sound effects to enhance the player's immersion experience.
- There should be clear sound cues for hunting and being hunted events.
- Visual feedback such as creature scaling or flashing effects can be appropriately added. 
---

## III. Technical Challenges and Optimization Directions 
| Challenges | Analysis and Solution Strategies | 
|------|----------------|
| Collision Detection and Performance | The core logic is simple, but simultaneous detection of multiple objects may affect frame rate; partitioned detection or quad-tree optimization can be adopted |
| Smooth Animation | The movements of characters and creatures require smooth interpolation and reasonable frame rate control to avoid screen lag |
| Rendering Optimization | Reduce the number of redraws per frame, merge the rendering of static elements, and ensure smooth operation on low-end devices |
| AI Behavior | The behaviors of small creatures should be natural, but the logic should be simple to avoid the performance burden caused by complex state machines | 
---

## IV. Game Experience and Design Highlights 
- Intuitive and easy-to-understand casual gameplay, suitable for short-term entertainment
- Gradual growth mechanism enhances players' sense of purpose and achievement
- AI behaviors and biological interactions enhance the richness of the scene
- Highly scalable: More types of creatures, skills or items can be added to enrich the gameplay 
---

## V. Development Cycle Reference 
- Single-player development of the basic version: approximately 1-2 weeks
- Adding advanced animations, complex creature behaviors and item systems: approximately 3-4 weeks
- Optional use of Canvas 2D, SVG or lightweight game libraries for implementation