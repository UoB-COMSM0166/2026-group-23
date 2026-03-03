# Heuristic Evaluation

# Name:Zhang Xun
# Project Title:Heuristic Evaluation of a Tower Defense Game Interface

------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------------
  Interface   Issue              Heuristic(s)     Frequency   Impact   Persistence   Severity
                                 Violated         (0--4)      (0--4)   (0--4)        (F+I+P)/3
  ----------- ------------------ ---------------- ----------- -------- ------------- ------------
  Tower       The first tower is 8\. Aesthetic    3           2        4             3.0
  Selection   functionally       and Minimalist                                      
  Interface   redundant and      Design; 4.                                          
              overlaps with the  Consistency and                                     
              second tower,      Standards                                           
              increasing                                                             
              cognitive load and                                                     
              reducing clarity                                                       
              in                                                                     
              decision-making.                                                       

  Tower       The absence of an  7\. Flexibility  4           3        4             3.67
  System      Area-of-Effect     and Efficiency                                      
  Design      (AOE) tower limits of Use; 2. Match                                    
              strategic          Between System                                      
              diversity and      and the Real                                        
              reduces gameplay   World                                               
              flexibility.                                                           

  Base Health When enemies reach 1\. Visibility   4           4        4             4.0
  System      the base, they     of System                                           
              disappear          Status; 5. Error                                    
              instantly, but the Prevention                                          
              HP deduction logic                                                     
              lacks clear visual                                                     
              or numerical                                                           
              feedback, reducing                                                     
              transparency.                                                          

  Anti-Air    The anti-air tower 7\. Flexibility  3           3        4             3.33
  Tower       lacks proper       and Efficiency                                      
  Mechanism   balance,           of Use; 4.                                          
              potentially making Consistency and                                     
              air enemies either Standards                                           
              too easy or too                                                        
              difficult to                                                           
              counter.                                                               

  Enemy Spawn Each path spawns   7\. Flexibility  4           3        4             3.67
  System      only one fixed     and Efficiency                                      
              enemy type (A or   of Use; 2. Match                                    
              B), reducing       Between System                                      
              unpredictability   and the Real                                        
              and replayability. World                                               
              Randomized                                                             
              spawning would                                                         
              improve                                                                
              engagement.                                                            

  Upgrade     The maximum        1\. Visibility   3           3        4             3.33
  System      upgrade level is   of System                                           
              not clearly        Status; 6.                                          
              indicated. Users   Recognition                                         
              must infer limits  Rather Than                                         
              rather than        Recall                                              
              recognizing them                                                       
              directly (should                                                       
              be limited to                                                          
              Level 3).                                                              

  Flying      Flying enemies     5\. Error        4           4        4             4.0
  Enemy       move too quickly,  Prevention; 7.                                      
  Balance     leaving            Flexibility and                                     
              insufficient       Efficiency of                                       
              reaction time and  Use                                                 
              negatively                                                             
              affecting game                                                         
              balance.                                                               

  Air Path    The air route      2\. Match        3           4        4             3.67
  System      mechanics are      Between System                                      
              unclear. Towers    and the Real                                        
              cannot be placed   World; 1.                                           
              on air paths, and  Visibility of                                       
              movement speed     System Status                                       
              logic differs                                                          
              without                                                                
              explanation.                                                           

  Home Page   The main interface 10\. Help and    4           4        4             4.0
  UI          lacks onboarding   Documentation;                                      
              guidance,          6. Recognition                                      
              tutorials, or      Rather Than                                         
              clear instructions Recall; 1.                                          
              for new players.   Visibility of                                       
                                 System Status                                       
  -----------------------------------------------------------------------------------------------
